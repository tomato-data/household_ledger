class TransactionsController < ApplicationController
  before_action :set_transaction, only: [ :edit, :update, :destroy ]

  def new
    @transaction = current_user.transactions.build(date: params[:date] || Date.today)
    @categories = current_user.categories.top_level.includes(:subcategories)
  end

  def create
    @transaction = current_user.transactions.build(transaction_params)

    if @transaction.save
      set_month_data
      respond_to do |format|
        format.turbo_stream # -> craete.turbo_stream.erb 렌더링
        format.html { redirect_to root_path }
      end
    else
      @categories = current_user.categories.top_level.includes(:subcategories)
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @categories = current_user.categories.top_level.includes(:subcategories)
  end

  def update
    if @transaction.update(transaction_params)
      set_month_data
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      @categories = current_user.categories.top_level.includes(:subcategories)
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @transaction.destroy
    set_month_data
    respond_to do |format|
      format.turbo_stream
    end
  end

  private

  def set_transaction
    @transaction = current_user.transactions.find(params[:id])
  end

  def transaction_params
    params.require(:transaction).permit(:date, :description, :amount, :transaction_type, :category_id, :status)
  end

  def set_month_data
    @date = @transaction.date.beginning_of_month
    month_transactions = current_user.transactions
                            .where(date: @date.beginning_of_month..@date.end_of_month)
                            .includes(:category)
    @transactions_by_date = month_transactions.group_by(&:date)
    @total_income = month_transactions.where(transaction_type: :income).sum(:amount)
    @total_expense = month_transactions.where(transaction_type: :expense).sum(:amount)
    @total_assets = current_user.transactions.where(transaction_type: :income).sum(:amount) - current_user.transactions.where(transaction_type: :expense).sum(:amount)
  end
end
