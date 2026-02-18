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
  end

  def daily_transactions
    @selected_date = params[:date] ? Date.parse(params[:date]) : Date.today
    @daily_transactions = current_user.transactions
                            .where(date: @selected_date)
                            .includes(:category)
                            .order(created_at: :desc)
  end
end
