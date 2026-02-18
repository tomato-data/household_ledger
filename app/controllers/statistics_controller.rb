class StatisticsController < ApplicationController
  def show
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    start_date = @date.beginning_of_month
    end_date = @date.end_of_month
    @type = params[:type] || "expense"
    transactions = current_user.transactions
                      .where(date: start_date..end_date)
                      .where(transaction_type: @type)
                      .joins(:category)
                      .group("categories.name", "categories.icon", "categories.color").sum(:amount)
    @category_stats = transactions.map { |key, amount| { name: key[0], icon: key[1], color: key[2], amount: amount } }
    @total = @category_stats.sum { |stat| stat[:amount] }
  end
end
