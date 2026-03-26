class CreateTaggings < ActiveRecord::Migration[8.1]
  def change
    create_table :taggings do |t|
      t.references :tag, null: false, foreign_key: true
      t.references :transaction, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.string :note

      t.timestamps
    end

    add_index :taggings, [:user_id, :date]
    add_index :taggings, [:user_id, :tag_id, :date]
  end
end
