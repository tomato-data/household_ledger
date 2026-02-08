class CreateAssetAdjustments < ActiveRecord::Migration[8.1]
  def change
    create_table :asset_adjustments do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :amount
      t.string :adjustment_type
      t.string :description
      t.date :adjustment_date

      t.timestamps
    end
    add_index :asset_adjustments, :adjustment_date
  end
end
