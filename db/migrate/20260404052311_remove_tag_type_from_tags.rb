class RemoveTagTypeFromTags < ActiveRecord::Migration[8.1]
  def change
    remove_index :tags, [:user_id, :tag_type], if_exists: true
    remove_column :tags, :tag_type, :string
  end
end
