class RenameEmojiToIconInCategories < ActiveRecord::Migration[8.1]
  def change
    rename_column :categories, :emoji, :icon
  end
end
