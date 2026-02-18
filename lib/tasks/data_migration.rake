namespace :data do
  desc "기존 PostgreSQL 백업 데이터를 Rails SQLite로 이관"
  task migrate: :environment do
    require "json"

    BACKUP_DIR = File.expand_path("~/household_ledger_backup")
    SOURCE_USER_UUID = "b5a9fccf-db4a-4a5a-86e6-51a3c684f6d9"
    TARGET_EMAIL = "ahsdfg30@gmail.com"

    # 대상 유저 찾기
    user = User.find_by!(email: TARGET_EMAIL)
    puts "대상 유저: #{user.email} (ID: #{user.id})"

    # 기존 카테고리/거래 삭제 (중복 방지 - 재실행 가능)
    user.transactions.delete_all
    user.categories.delete_all
    puts "기존 데이터 초기화 완료"

    # === 1. 카테고리 이관 ===
    categories_json = JSON.parse(File.read("#{BACKUP_DIR}/hl_categories.json"))
    source_categories = categories_json.select { |c| c["user_id"] == SOURCE_USER_UUID }

    category_id_map = {} # UUID → 새 정수 ID 매핑

    source_categories.sort_by { |c| c["order"] }.each do |cat|
      new_cat = user.categories.create!(
        name: cat["name"],
        emoji: cat["emoji"],
        position: cat["order"].to_i + 1
      )
      category_id_map[cat["id"]] = new_cat.id
      puts "  카테고리: #{cat['emoji']} #{cat['name']} (#{cat['id']} → #{new_cat.id})"
    end
    puts "카테고리 #{category_id_map.size}개 이관 완료"

    # === 2. 거래 이관 ===
    transactions_json = JSON.parse(File.read("#{BACKUP_DIR}/hl_transactions.json"))
    source_transactions = transactions_json.select { |t| t["user_id"] == SOURCE_USER_UUID }

    tx_count = 0
    skipped = 0

    source_transactions.each do |tx|
      new_category_id = category_id_map[tx["category_id"]]

      unless new_category_id
        puts "  [SKIP] 카테고리 매핑 없음: #{tx['description']} (category_id: #{tx['category_id']})"
        skipped += 1
        next
      end

      user.transactions.create!(
        date: Date.parse(tx["date"]),
        description: tx["description"],
        amount: tx["amount"].to_i,
        transaction_type: tx["type"].downcase,
        category_id: new_category_id,
        status: tx["status"].downcase,
        created_at: tx["created_at"],
        updated_at: tx["updated_at"]
      )
      tx_count += 1
    end
    puts "거래 #{tx_count}개 이관 완료 (스킵: #{skipped}개)"

    # === 3. 반복 거래 이관 ===
    recurring_json = JSON.parse(File.read("#{BACKUP_DIR}/hl_recurring_transactions.json"))
    source_recurring = recurring_json.select { |r| r["user_id"] == SOURCE_USER_UUID }

    rt_count = 0
    source_recurring.each do |rt|
      user.recurring_transactions.create!(
        template_name: rt["template_name"],
        description: rt["description"],
        amount: rt["amount"].to_i,
        transaction_type: rt["type"].downcase,
        frequency: rt["frequency"].downcase,
        start_date: rt["start_date"] ? Date.parse(rt["start_date"]) : nil,
        end_date: rt["end_date"] ? Date.parse(rt["end_date"]) : nil,
        day_of_month: rt["day_of_month"],
        is_active: rt["is_active"],
        is_variable_amount: rt["is_variable_amount"],
        created_at: rt["created_at"],
        updated_at: rt["updated_at"]
      )
      rt_count += 1
    end
    puts "반복 거래 #{rt_count}개 이관 완료"

    # === 결과 요약 ===
    puts "\n=== 이관 완료 ==="
    puts "유저: #{user.email}"
    puts "카테고리: #{user.categories.count}개"
    puts "거래: #{user.transactions.count}개"
    puts "반복 거래: #{user.recurring_transactions.count}개"
  end
end
