class DashboardController < ApplicationController
  def index
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    start_date = @date.beginning_of_month
    end_date = @date.end_of_month
    @transactions = current_user.transactions
                      .where(date: start_date..end_date)
                      .includes(:category)
    @transactions_by_date = @transactions.group_by(&:date)
    @total_income = @transactions.where(transaction_type: :income).sum(:amount)
    @total_expense = @transactions.where(transaction_type: :expense).sum(:amount)
    @total_assets = current_user.transactions.where("date <= ?", Date.today).where(transaction_type: :income).sum(:amount) -
                      current_user.transactions.where("date <= ?", Date.today).where(transaction_type: :expense).sum(:amount)

    @selected_dates = [ @date > Date.today ? start_date : Date.today ]
    load_selection_data
  end

  def daily_transactions
    @selected_dates = parse_dates(params[:dates] || params[:date])
    load_selection_data
  end

  private

  def parse_dates(date_param)
    return [ Date.today ] unless date_param

    if date_param.is_a?(Array)
      date_param.map { |d| Date.parse(d) }.sort
    else
      [ Date.parse(date_param.to_s) ]
    end
  end

  def load_selection_data
    @daily_transactions = current_user.transactions
                            .where(date: @selected_dates)
                            .includes(category: :parent)
                            .order(date: :desc, created_at: :desc)

    # 부모 카테고리 기준 그룹핑
    expense_txns = @daily_transactions.select { |t| t.transaction_type == "expense" }
    parent_groups = {}
    expense_txns.each do |t|
      cat = t.category
      parent = cat.parent || cat
      parent_groups[parent.id] ||= {
        name: parent.name, icon: parent.icon, color: parent.color, amount: 0
      }
      parent_groups[parent.id][:amount] += t.amount
    end

    @selection_stats = parent_groups.values.sort_by { |s| -s[:amount] }
    @selection_total = @selection_stats.sum { |s| s[:amount] }
    @selection_income = @daily_transactions.select { |t| t.transaction_type == "income" }.sum(&:amount)
    @selection_expense = expense_txns.sum(&:amount)
  end
end
