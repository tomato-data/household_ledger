class Tagging < ApplicationRecord
  belongs_to :tag
  belongs_to :user
  belongs_to :linked_transaction, class_name: "Transaction", foreign_key: "transaction_id", optional: true

  validates :date, presence: true

  scope :on_date, ->(date) { where(date: date) }
  scope :in_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :standalone, -> { where(transaction_id: nil) }
  scope :linked, -> { where.not(transaction_id: nil) }
end
