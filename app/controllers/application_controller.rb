class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  before_action :authenticate_user!
  before_action :resolve_scheduled_transactions

  private
  def resolve_scheduled_transactions
    return unless user_signed_in?

    current_user.transactions
      .where(status: :scheduled)
      .where("date <= ?", Date.today)
      .update_all(status: :confirmed)
  end
end

