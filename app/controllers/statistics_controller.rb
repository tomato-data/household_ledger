class StatisticsController < ApplicationController
  def show
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    start_date = @date.beginning_of_month
    end_date = @date.end_of_month
    @type = params[:type] || "expense"

    transactions = current_user.transactions
                      .where(date: start_date..end_date)
                      .where(transaction_type: @type)
                      .includes(category: :parent)

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

      # 서브카테고리가 있는 경우만 하위 집계
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
