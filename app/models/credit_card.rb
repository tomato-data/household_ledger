class CreditCard < ApplicationRecord
  belongs_to :user

  validates :name, presence: true, length: { maximum: 50 }
  validates :payment_day, presence: true, numericality: { greater_than: 0, lesser_than: 29 }
end
