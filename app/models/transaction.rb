class Transaction < ApplicationRecord
  enum :transaction_type, { income: "income", expense: "expense" }
  enum :status, { confirmed: "confirmed", scheduled: "scheduled", pending: "pending" }
  belongs_to :user
  belongs_to :category
  belongs_to :recurring_transaction, optional: true

  validates :description, presence: true, length: { maximum: 255 }
  validates :amount, presence: true, numericality: { only_integer: true }
  validates :date, presence: true

  scope :by_date_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :by_category, ->(category_id) { where(category_id: category_id) }
  scope :by_type, ->(type) { where(transaction_type: type) }
  scope :confirmed_only, -> { where(status: :confirmed) }
end
