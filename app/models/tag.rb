class Tag < ApplicationRecord
  belongs_to :user
  has_many :taggings, dependent: :destroy
  has_many :transactions, through: :taggings

  validates :name, presence: true, length: { maximum: 50 }
  validates :color, presence: true

  default_scope { order(:position) }

  def days_since_last_use
    last = taggings.maximum(:date)
    last ? (Date.today - last).to_i : nil
  end
end
