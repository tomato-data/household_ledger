class Category < ApplicationRecord
  belongs_to :user
  belongs_to :parent, class_name: "Category", optional: true
  has_many :subcategories, class_name: "Category", foreign_key: :parent_id, dependent: :destroy
  has_many :transactions, dependent: :destroy

  validates :name, presence: true, length: { maximum: 100 }
  default_scope { order(:position) }

  scope :top_level, -> { where(parent_id: nil) }

  def top_level?
    parent_id.nil?
  end

  # 표시 이름: "식비 > 점심" 형태
  def full_name
    parent ? "#{parent.name} > #{name}" : name
  end
end
