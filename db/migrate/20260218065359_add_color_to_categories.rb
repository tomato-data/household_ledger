class AddColorToCategories < ActiveRecord::Migration[8.1]
  def change
    add_column :categories, :color, :string, default: "#a3a3a3"
  end
end
