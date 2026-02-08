class AssetAdjustment < ApplicationRecord
  enum :adjustment_type, { income_missing: "income_missing", expense_missing: "expense_missing" }
  belongs_to :user
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :description, presence: true
  validates :adjustment_date, presence: true
end
