class AddPurchaseDateToTransactions < ActiveRecord::Migration[8.1]
  def change
    add_column :transactions, :purchase_date, :date
  end
end
