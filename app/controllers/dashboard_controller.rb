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
    @total_assets = current_user.transactions.where(transaction_type: :income).sum(:amount) -
                      current_user.transactions.where(transaction_type: :expense).sum(:amount)

    # 초기 로드: 오늘 날짜의 거래
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
                            .includes(:category)
                            .order(date: :desc, created_at: :desc)

    # 선택된 날짜들의 카테고리별 통계
    @selection_stats = current_user.transactions
                         .where(date: @selected_dates)
                         .where(transaction_type: :expense)
                         .joins(:category)
                         .group("categories.name", "categories.icon", "categories.color")
                         .sum(:amount)
                         .map { |key, amount| { name: key[0], icon: key[1], color: key[2], amount: amount } }
                         .sort_by { |s| -s[:amount] }

    @selection_total = @selection_stats.sum { |s| s[:amount] }
    @selection_income = @daily_transactions.select { |t| t.transaction_type == "income" }.sum(&:amount)
    @selection_expense = @daily_transactions.select { |t| t.transaction_type == "expense" }.sum(&:amount)
  end
end
