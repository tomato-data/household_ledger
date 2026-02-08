class Category < ApplicationRecord
  belongs_to :user
  has_many :transactions, dependent: :destroy

  validates :name, presence: true, length: { maximum: 100 }
  default_scope { order(:position) }
end
