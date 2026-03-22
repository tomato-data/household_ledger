class StatisticsController < ApplicationController
  def show
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    start_date = @date.beginning_of_month
    end_date = @date.end_of_month
    @type = params[:type] || "expense"
    @date_mode = params[:date_mode] || "purchase" # purchase(긁은 날) / payment(빠져나가는 날)

    # 날짜 기준 선택: 카드 결제는 purchase_date, 일반은 date
    if @date_mode == "purchase"
      # 긁은 날 기준: 카드 거래는 purchase_date, 비카드 거래는 date
      transactions = current_user.transactions
                        .where(transaction_type: @type)
                        .includes(category: :parent)
                        .where(
                          "(credit_card_id IS NOT NULL AND purchase_date BETWEEN ? AND ?) OR (credit_card_id IS NULL AND date BETWEEN ? AND ?)",
                          start_date, end_date, start_date, end_date
                        )
    else
      # 빠져나가는 날 기준: 모든 거래의 date 컬럼
      transactions = current_user.transactions
                        .where(date: start_date..end_date)
                        .where(transaction_type: @type)
                        .includes(category: :parent)
    end

    # 부모 카테고리 기준 그룹핑
    parent_groups = {}
    transactions.each do |t|
      cat = t.category
      parent = cat.parent || cat
      parent_groups[parent.id] ||= {
        name: parent.name, icon: parent.icon, color: parent.color,
        amount: 0, subcategories: {}
      }
      parent_groups[parent.id][:amount] += t.amount

      if cat.parent_id
        parent_groups[parent.id][:subcategories][cat.id] ||= {
          name: cat.name, icon: cat.icon, color: cat.color, amount: 0
        }
        parent_groups[parent.id][:subcategories][cat.id][:amount] += t.amount
      end
    end

    @category_stats = parent_groups.values
                        .sort_by { |s| -s[:amount] }
                        .map do |s|
                          s[:subcategories] = s[:subcategories].values.sort_by { |sc| -sc[:amount] }
                          s
                        end

    @total = @category_stats.sum { |stat| stat[:amount] }
  end
end
