class CreateTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.string :description, null: false, limit: 255
      t.integer :amount, null: false
      t.string :transaction_type, null: false
      t.references :category, null: false, foreign_key: true
      t.string :status, null: false, default: "confirmed"
      t.references :recurring_transaction, foreign_key: true

      t.timestamps
    end
    add_index :transactions, :date
  end
end
