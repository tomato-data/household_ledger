class CreateCreditCards < ActiveRecord::Migration[8.1]
  def change
    create_table :credit_cards do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :payment_day, null: false

      t.timestamps
    end
  end
end
