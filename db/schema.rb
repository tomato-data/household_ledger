# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_18_065359) do
  create_table "asset_adjustments", force: :cascade do |t|
    t.date "adjustment_date"
    t.string "adjustment_type"
    t.integer "amount"
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["adjustment_date"], name: "index_asset_adjustments_on_adjustment_date"
    t.index ["user_id"], name: "index_asset_adjustments_on_user_id"
  end

  create_table "categories", force: :cascade do |t|
    t.string "color", default: "#a3a3a3"
    t.datetime "created_at", null: false
    t.string "icon"
    t.string "name"
    t.integer "position"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_categories_on_user_id"
  end

  create_table "recurring_transactions", force: :cascade do |t|
    t.integer "amount"
    t.datetime "created_at", null: false
    t.integer "day_of_month"
    t.string "description"
    t.datetime "discarded_at"
    t.date "end_date"
    t.string "frequency"
    t.boolean "is_active"
    t.boolean "is_variable_amount"
    t.date "start_date"
    t.string "template_name"
    t.string "transaction_type"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["discarded_at"], name: "index_recurring_transactions_on_discarded_at"
    t.index ["user_id"], name: "index_recurring_transactions_on_user_id"
  end

  create_table "transactions", force: :cascade do |t|
    t.integer "amount", null: false
    t.integer "category_id", null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.string "description", limit: 255, null: false
    t.integer "recurring_transaction_id"
    t.string "status", default: "confirmed", null: false
    t.string "transaction_type", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["category_id"], name: "index_transactions_on_category_id"
    t.index ["date"], name: "index_transactions_on_date"
    t.index ["recurring_transaction_id"], name: "index_transactions_on_recurring_transaction_id"
    t.index ["user_id"], name: "index_transactions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "asset_adjustments", "users"
  add_foreign_key "categories", "users"
  add_foreign_key "recurring_transactions", "users"
  add_foreign_key "transactions", "categories"
  add_foreign_key "transactions", "recurring_transactions"
  add_foreign_key "transactions", "users"
end
