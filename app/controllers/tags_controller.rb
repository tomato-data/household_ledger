class TagsController < ApplicationController
  before_action :set_tag, only: [:edit, :update, :destroy]

  def index
    @tags = current_user.tags.reorder(:tag_type, :position)
    @last_dates = current_user.taggings.group(:tag_id).maximum(:date)
    @grouped_tags = @tags.group_by(&:tag_type)
  end

  def new
    @tag = current_user.tags.build(tag_type: params[:tag_type] || "general")
    render layout: false
  end

  def create
    @tag = current_user.tags.build(tag_params)
    @tag.position = current_user.tags.where(tag_type: @tag.tag_type).count + 1
    if @tag.save
      @tags = current_user.tags.reorder(:tag_type, :position)
      @last_dates = current_user.taggings.group(:tag_id).maximum(:date)
      @grouped_tags = @tags.group_by(&:tag_type)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to tags_path }
      end
    else
      render :new, layout: false, status: :unprocessable_entity
    end
  end

  def edit
    render layout: false
  end

  def update
    if @tag.update(tag_params)
      @tags = current_user.tags.reorder(:tag_type, :position)
      @last_dates = current_user.taggings.group(:tag_id).maximum(:date)
      @grouped_tags = @tags.group_by(&:tag_type)
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to tags_path }
      end
    else
      render :edit, layout: false, status: :unprocessable_entity
    end
  end

  def destroy
    @tag.destroy
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to tags_path }
    end
  end

  def reorder
    params[:ids].each_with_index do |id, index|
      current_user.tags.find(id).update(position: index + 1)
    end
    head :no_content
  end

  private

  def set_tag
    @tag = current_user.tags.find(params[:id])
  end

  def tag_params
    params.require(:tag).permit(:name, :color, :tag_type, :icon)
  end
end
