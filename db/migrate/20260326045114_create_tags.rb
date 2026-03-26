class CreateTags < ActiveRecord::Migration[8.1]
  def change
    create_table :tags do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :color, default: "#6366f1"
      t.string :tag_type, null: false, default: "general"
      t.string :icon
      t.integer :position

      t.timestamps
    end

    add_index :tags, [:user_id, :tag_type]
  end
end
