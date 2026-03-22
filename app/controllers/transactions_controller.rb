class TransactionsController < ApplicationController
  before_action :set_transaction, only: [ :edit, :update, :destroy ]

  def new
    @transaction = current_user.transactions.build(date: params[:date] || Date.today)
    load_form_data
  end

  def create
    @transaction = current_user.transactions.build(transaction_params)

    # 카드 결제 처리
    if params[:card_payment] == "1" && params[:credit_card_id].present?
      create_card_transactions
      return
    end

    if @transaction.save
      set_month_data
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      load_form_data
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    load_form_data
  end

  def update
    if @transaction.update(transaction_params)
      set_month_data
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      load_form_data
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    # 할부 그룹 전체 삭제 옵션
    if params[:delete_group] == "1" && @transaction.installment_group.present?
      current_user.transactions.where(installment_group: @transaction.installment_group).destroy_all
    else
      @transaction.destroy
    end
    set_month_data
    respond_to do |format|
      format.turbo_stream
    end
  end

  private

  def set_transaction
    @transaction = current_user.transactions.find(params[:id])
  end

  def load_form_data
    @categories = current_user.categories.top_level.includes(:subcategories)
    @credit_cards = current_user.credit_cards
  end

  def transaction_params
    params.require(:transaction).permit(:date, :description, :amount, :transaction_type, :category_id, :status, :credit_card_id)
  end

  def create_card_transactions
    card = current_user.credit_cards.find(params[:credit_card_id])
    installment_count = (params[:installment_count].to_i > 1) ? params[:installment_count].to_i : 1
    purchase_date = Date.parse(@transaction.date.to_s)
    base_amount = @transaction.amount
    monthly_amount = (base_amount.to_f / installment_count).round

    group_id = installment_count > 1 ? SecureRandom.uuid : nil
    created_transactions = []

    installment_count.times do |i|
      payment_date = card.next_payment_date(purchase_date) + i.months
      per_amount = (i == installment_count - 1) ? base_amount - (monthly_amount * (installment_count - 1)) : monthly_amount

      t = current_user.transactions.create!(
        date: payment_date,
        purchase_date: purchase_date,
        description: installment_count > 1 ? "#{@transaction.description} (#{i + 1}/#{installment_count})" : @transaction.description,
        amount: per_amount,
        transaction_type: @transaction.transaction_type,
        category_id: @transaction.category_id,
        status: :scheduled,
        credit_card_id: card.id,
        installment_count: installment_count > 1 ? installment_count : nil,
        installment_number: installment_count > 1 ? i + 1 : nil,
        installment_group: group_id
      )
      created_transactions << t
    end

    @transaction = created_transactions.first
    set_month_data
    respond_to do |format|
      format.turbo_stream { render "create" }
      format.html { redirect_to root_path }
    end
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
