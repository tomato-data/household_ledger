class CreditCard < ApplicationRecord
  belongs_to :user
  has_many :transactions, dependent: :nullify

  validates :name, presence: true, length: { maximum: 50 }
  validates :payment_day, presence: true, numericality: { only_integer: true, greater_than: 0, less_than: 29 }

  # 기본 카드 설정 시 다른 카드의 기본 해제
  before_save :ensure_single_default

  scope :default_card, -> { find_by(is_default: true) }

  # 구매월 다음 달 결제일 반환
  def next_payment_date(from_date)
    Date.new(from_date.year, from_date.month, payment_day).next_month
  end

  private

  def ensure_single_default
    if is_default && is_default_changed?
      user.credit_cards.where.not(id: id).update_all(is_default: false)
    end
  end
end
