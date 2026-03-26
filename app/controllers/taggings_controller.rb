class TaggingsController < ApplicationController
  def new
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    @tags = current_user.tags.reorder(:tag_type, :position)
  end

  def create
    @tagging = current_user.taggings.build(tagging_params)

    if @tagging.save
      respond_to do |format|
        format.turbo_stream {
          set_month_data(@tagging.date)
        }
        format.html { redirect_back fallback_location: root_path }
      end
    else
      head :unprocessable_entity
    end
  end

  def destroy
    @tagging = current_user.taggings.find(params[:id])
    date = @tagging.date
    @tagging.destroy

    respond_to do |format|
      format.turbo_stream {
        set_month_data(date)
      }
      format.html { redirect_back fallback_location: root_path }
    end
  end

  private

  def tagging_params
    params.require(:tagging).permit(:tag_id, :date, :transaction_id, :note)
  end

  def set_month_data(date)
    @date = date.beginning_of_month
    month_transactions = current_user.transactions
                          .where(date: @date..@date.end_of_month)
                          .includes(:category)
    @transactions_by_date = month_transactions.group_by(&:date)
    @total_income = month_transactions.where(transaction_type: :income).sum(:amount)
    @total_expense = month_transactions.where(transaction_type: :expense).sum(:amount)
    @total_assets = current_user.transactions.where("date <= ?", Date.today).where(transaction_type: :income).sum(:amount) -
                    current_user.transactions.where("date <= ?", Date.today).where(transaction_type: :expense).sum(:amount)

    # taggings for calendar
    start_date = @date.beginning_of_month.beginning_of_week(:sunday)
    end_date = @date.end_of_month.end_of_week(:sunday)
    @taggings_by_date = current_user.taggings
                          .where(date: start_date..end_date)
                          .includes(:tag)
                          .group_by(&:date)

    @selected_dates = [date]
    @daily_transactions = current_user.transactions
                            .where(date: @selected_dates)
                            .includes(category: :parent)
                            .order(date: :desc, created_at: :desc)
    @daily_taggings = current_user.taggings
                        .where(date: @selected_dates)
                        .includes(:tag)
                        .order(created_at: :desc)
    @selection_income = @daily_transactions.select { |t| t.transaction_type == "income" }.sum(&:amount)
    @selection_expense = @daily_transactions.select { |t| t.transaction_type == "expense" }.sum(&:amount)
  end
end
