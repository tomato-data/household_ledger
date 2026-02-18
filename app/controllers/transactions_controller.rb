class TransactionsController < ApplicationController
  before_action :set_transaction, only: [ :edit, :update, :destroy ]

  def new
    @transaction = current_user.transactions.build
    @categories = current_user.categories
  end

  def create
    @transaction = current_user.transactions.build(transaction_params)

    if @transaction.save
      respond_to do |format|
        format.turbo_stream # -> craete.turbo_stream.erb 렌더링
        format.html { redirect_to root_path }
      end
    else
      @categories = current_user.categories
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @categories = current_user.categories
  end

  def update
    if @transaction.update(transaction_params)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      @categories = current_user.categories
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @transaction.destroy
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
end
