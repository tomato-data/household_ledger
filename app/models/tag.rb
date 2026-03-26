class Tag < ApplicationRecord
  belongs_to :user
  has_many :taggings, dependent: :destroy
  has_many :transactions, through: :taggings

  enum :tag_type, { general: "general", giving: "giving", receiving: "receiving" }

  validates :name, presence: true, length: { maximum: 50 }
  validates :color, presence: true
  validates :tag_type, presence: true

  default_scope { order(:position) }

  scope :general_tags, -> { where(tag_type: :general) }
  scope :kindness_tags, -> { where(tag_type: [:giving, :receiving]) }

  def days_since_last_use
    last = taggings.maximum(:date)
    last ? (Date.today - last).to_i : nil
  end
end
