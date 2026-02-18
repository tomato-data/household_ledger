class CategoriesController < ApplicationController
  before_action :set_category, only: [ :update, :destroy ]
  def index
    @categories = current_user.categories
  end

  def create
    @category = current_user.categories.build(category_params)
    if @category.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      render :index
    end
  end

  def update
    if @category.update(category_params)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path }
      end
    else
      render :index
    end
  end

  def destroy
    @category.destroy
    respond_to do |format|
      format.turbo_stream
    end
  end

  def reorder
    params[:ids].each_with_index do |id, index|
      current_user.categories.find(id).update(position: index + 1)
    end
    head :no_content
  end

  private

  def set_category
    @category = current_user.categories.find(params[:id])
  end

  def category_params
    params.require(:category).permit(:name, :icon, :color)
  end
end
