class CreateRecurringTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :recurring_transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :template_name
      t.string :description
      t.integer :amount
      t.string :transaction_type
      t.string :frequency
      t.date :start_date
      t.date :end_date
      t.integer :day_of_month
      t.boolean :is_active
      t.boolean :is_variable_amount
      t.datetime :discarded_at

      t.timestamps
    end
    add_index :recurring_transactions, :discarded_at
  end
end
