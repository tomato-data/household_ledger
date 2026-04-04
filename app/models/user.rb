class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :categories, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :recurring_transactions, dependent: :destroy
  has_many :asset_adjustments, dependent: :destroy
  has_many :credit_cards, dependent: :destroy
  has_many :tags, dependent: :destroy
  has_many :taggings, dependent: :destroy


  DEFAULT_CATEGORIES = [
    { name: "식비", icon: "utensils", position: 1 },
    { name: "간식류", icon: "cookie", position: 2 },
    { name: "카페", icon: "coffee", position: 3 },
    { name: "교통비", icon: "car", position: 4 },
    { name: "문화생활", icon: "film", position: 5 },
    { name: "의류", icon: "shirt", position: 6 },
    { name: "생필품", icon: "shopping-cart", position: 7 },
    { name: "의료비", icon: "heart-pulse", position: 8 },
    { name: "월급", icon: "wallet", position: 9 },
    { name: "월세", icon: "home", position: 10 },
    { name: "통신비", icon: "smartphone", position: 11 },
    { name: "공과금", icon: "zap", position: 12 },
    { name: "기타", icon: "file-text", position: 13 }
  ].freeze

  DEFAULT_TAGS = [
    { name: "베풂", color: "#f97316", icon: "heart", position: 1 },
    { name: "대접받음", color: "#3b82f6", icon: "gift", position: 2 }
  ].freeze

  after_create :create_default_categories
  after_create :create_default_tags

  private
  def create_default_categories
    DEFAULT_CATEGORIES.each do |category|
      categories.create!(category)
    end
  end

  def create_default_tags
    DEFAULT_TAGS.each do |tag|
      tags.create!(tag)
    end
  end
end
