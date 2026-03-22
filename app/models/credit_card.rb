class CreditCard < ApplicationRecord
  belongs_to :user
  has_many :transactions, dependent: :nullify

  validates :name, presence: true, length: { maximum: 50 }
  validates :payment_day, presence: true, numericality: { only_integer: true, greater_than: 0, less_than: 29 }

  # 기본 카드 설정 시 다른 카드의 기본 해제
  before_save :ensure_single_default

  scope :default_card, -> { find_by(is_default: true) }

  # 특정 날짜 기준 다음 결제일 계산
  def next_payment_date(from_date)
    # 이번 달 결제일이 아직 안 지났으면 이번 달, 지났으면 다음 달
    this_month_payment = Date.new(from_date.year, from_date.month, payment_day)

    if from_date < this_month_payment
      this_month_payment.next_month
    else
      this_month_payment + 2.months
    end
  end

  private

  def ensure_single_default
    if is_default && is_default_changed?
      user.credit_cards.where.not(id: id).update_all(is_default: false)
    end
  end
end
