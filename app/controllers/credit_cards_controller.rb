class CreditCardsController < ApplicationController
  before_action :set_credit_card, only: [ :edit, :update, :destroy ]

  def index
    @credit_cards = current_user.credit_cards
  end

  def create
    @credit_card = current_user.credit_cards.build(credit_card_params)
    if @credit_card.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to credit_cards_path }
      end
    else
      @credit_cards = current_user.credit_cards
      render :index, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @credit_card.update(credit_card_params)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to credit_cards_path }
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @credit_card.destroy
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to credit_cards_path }
    end
  end

  private

  def set_credit_card
    @credit_card = current_user.credit_cards.find(params[:id])
  end

  def credit_card_params
    params.require(:credit_card).permit(:name, :payment_day, :is_default)
  end
end
