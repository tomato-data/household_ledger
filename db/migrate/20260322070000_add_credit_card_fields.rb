class AddCreditCardFields < ActiveRecord::Migration[8.1]
  def change
    # 신용카드에 기본 카드 플래그
    add_column :credit_cards, :is_default, :boolean, default: false

    # 거래에 카드 결제 정보
    add_reference :transactions, :credit_card, foreign_key: true, null: true
    add_column :transactions, :installment_count, :integer    # 총 할부 개월수 (null이면 일시불)
    add_column :transactions, :installment_number, :integer   # 현재 회차 (1/3, 2/3...)
    add_column :transactions, :installment_group, :string     # 같은 할부 묶음 ID
  end
end
