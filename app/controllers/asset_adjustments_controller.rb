class AssetAdjustmentsController < ApplicationController
  before_action :set_asset_adjustment, only: [ :edit, :update, :destroy ]

  def index
    @asset_adjustments = current_user.asset_adjustments.order(adjustment_date: :desc)
  end

  def new
    @asset_adjustment = current_user.asset_adjustments.build
  end

  def create
    @asset_adjustment = current_user.asset_adjustments.build(asset_adjustment_params)

    if @asset_adjustment.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to asset_adjustments_path }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @asset_adjustment.update(asset_adjustment_params)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to asset_adjustments_path }
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @asset_adjustment.destroy
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to asset_adjustments_path }
    end
  end

  private

  def set_asset_adjustment
    @asset_adjustment = current_user.asset_adjustments.find(params[:id])
  end

  def asset_adjustment_params
    params.require(:asset_adjustment).permit(:adjustment_date, :amount, :adjustment_type, :description)
  end
end
