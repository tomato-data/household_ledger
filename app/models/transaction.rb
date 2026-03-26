class Transaction < ApplicationRecord
  enum :transaction_type, { income: "income", expense: "expense" }
  enum :status, { confirmed: "confirmed", scheduled: "scheduled", pending: "pending" }
  belongs_to :user
  belongs_to :category
  belongs_to :recurring_transaction, optional: true
  belongs_to :credit_card, optional: true
  has_many :taggings, foreign_key: "transaction_id", dependent: :destroy
  has_many :tags, through: :taggings

  validates :description, presence: true, length: { maximum: 255 }
  validates :amount, presence: true, numericality: { only_integer: true }
  validates :date, presence: true

  scope :by_date_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :by_category, ->(category_id) { where(category_id: category_id) }
  scope :by_type, ->(type) { where(transaction_type: type) }
  scope :confirmed_only, -> { where(status: :confirmed) }

  def card_payment?
    credit_card_id.present?
  end

  def installment?
    installment_count.present? && installment_count > 1
  end

  def installment_label
    return nil unless installment?
    "#{installment_number}/#{installment_count}"
  end
end
