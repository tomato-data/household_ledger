class RecurringTransactionsController < ApplicationController
  before_action :set_recurring_transaction, only: [ :edit, :update, :destroy ]

  def index
    @recurring_transactions = current_user.recurring_transactions
  end

  def new
    @recurring_transaction = current_user.recurring_transactions.build
  end

  def create
    @recurring_transaction = current_user.recurring_transactions.build(recurring_transaction_params)

    if @recurring_transaction.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to recurring_transactions_path }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @recurring_transaction.update(recurring_transaction_params)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to recurring_transactions_path }
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @recurring_transaction.discard
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to recurring_transactions_path }
    end
  end

  private

  def set_recurring_transaction
    @recurring_transaction = current_user.recurring_transactions.find(params[:id])
  end

  def recurring_transaction_params
    params.require(:recurring_transaction).permit(
      :template_name, :description, :amount, :transaction_type,
      :frequency, :start_date, :end_date, :day_of_month,
      :is_active, :is_variable_amount
    )
  end
end
