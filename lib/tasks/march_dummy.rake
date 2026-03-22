namespace :data do
  desc "3월 더미 데이터 생성 (서브카테고리 포함)"
  task march_dummy: :environment do
    user = User.first
    abort "유저가 없습니다" unless user

    puts "=== 서브카테고리 생성 ==="

    # 식비 하위
    food = user.categories.find_by(name: "식비")
    if food
      %w[점심 저녁 배달].each do |name|
        food.subcategories.find_or_create_by!(name: name) do |c|
          c.user = user
          c.icon = food.icon
          c.color = food.color
        end
      end
      puts "  식비 → #{food.subcategories.pluck(:name).join(', ')}"
    end

    # 카페 하위
    cafe = user.categories.find_by(name: "카페")
    if cafe
      %w[커피 디저트].each do |name|
        cafe.subcategories.find_or_create_by!(name: name) do |c|
          c.user = user
          c.icon = cafe.icon
          c.color = cafe.color
        end
      end
      puts "  카페 → #{cafe.subcategories.pluck(:name).join(', ')}"
    end

    # 교통비 하위
    transport = user.categories.find_by(name: "교통비")
    if transport
      %w[대중교통 택시 주유].each do |name|
        transport.subcategories.find_or_create_by!(name: name) do |c|
          c.user = user
          c.icon = transport.icon
          c.color = transport.color
        end
      end
      puts "  교통비 → #{transport.subcategories.pluck(:name).join(', ')}"
    end

    # 문화생활 하위
    culture = user.categories.find_by(name: "문화생활")
    if culture
      %w[영화 구독료 게임].each do |name|
        culture.subcategories.find_or_create_by!(name: name) do |c|
          c.user = user
          c.icon = culture.icon
          c.color = culture.color
        end
      end
      puts "  문화생활 → #{culture.subcategories.pluck(:name).join(', ')}"
    end

    puts "\n=== 3월 거래 데이터 생성 ==="

    # 카테고리 로드
    cats = {}
    user.categories.includes(:subcategories).each do |c|
      cats[c.name] = c
      c.subcategories.each { |s| cats["#{c.name}/#{s.name}"] = s }
    end

    # 기존 3월 데이터 삭제
    user.transactions.where(date: Date.new(2026, 3, 1)..Date.new(2026, 3, 31)).destroy_all

    transactions = [
      # 3/1
      { date: "2026-03-01", desc: "월급", amount: 3_200_000, type: :income, cat: "월급" },
      { date: "2026-03-01", desc: "월세 이체", amount: 520_000, type: :expense, cat: "월세" },

      # 3/2
      { date: "2026-03-02", desc: "회사 근처 국밥", amount: 9_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-02", desc: "스타벅스 아메리카노", amount: 4_500, type: :expense, cat: "카페/커피" },
      { date: "2026-03-02", desc: "버스 충전", amount: 30_000, type: :expense, cat: "교통비/대중교통" },

      # 3/3
      { date: "2026-03-03", desc: "김치찌개", amount: 8_000, type: :expense, cat: "식비/점심" },
      { date: "2026-03-03", desc: "배민 치킨", amount: 22_000, type: :expense, cat: "식비/배달" },

      # 3/4
      { date: "2026-03-04", desc: "돈까스 정식", amount: 11_000, type: :expense, cat: "식비/점심" },
      { date: "2026-03-04", desc: "투썸 케이크", amount: 6_800, type: :expense, cat: "카페/디저트" },
      { date: "2026-03-04", desc: "넷플릭스", amount: 17_000, type: :expense, cat: "문화생활/구독료" },

      # 3/5
      { date: "2026-03-05", desc: "통신비 자동이체", amount: 55_000, type: :expense, cat: "통신비" },
      { date: "2026-03-05", desc: "회사 점심 제육", amount: 9_000, type: :expense, cat: "식비/점심" },

      # 3/6
      { date: "2026-03-06", desc: "삼겹살 회식", amount: 35_000, type: :expense, cat: "식비/저녁" },
      { date: "2026-03-06", desc: "택시 귀가", amount: 15_200, type: :expense, cat: "교통비/택시" },

      # 3/7
      { date: "2026-03-07", desc: "마트 장보기", amount: 48_300, type: :expense, cat: "생필품" },
      { date: "2026-03-07", desc: "감기약", amount: 8_500, type: :expense, cat: "의료비" },

      # 3/8
      { date: "2026-03-08", desc: "쿠팡이츠 피자", amount: 25_000, type: :expense, cat: "식비/배달" },
      { date: "2026-03-08", desc: "영화 듄3", amount: 14_000, type: :expense, cat: "문화생활/영화" },
      { date: "2026-03-08", desc: "팝콘 콤보", amount: 9_500, type: :expense, cat: "간식류" },

      # 3/9
      { date: "2026-03-09", desc: "이디야 라떼", amount: 4_300, type: :expense, cat: "카페/커피" },
      { date: "2026-03-09", desc: "집밥 재료", amount: 15_600, type: :expense, cat: "생필품" },

      # 3/10
      { date: "2026-03-10", desc: "점심 비빔밥", amount: 8_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-10", desc: "전기세", amount: 32_000, type: :expense, cat: "공과금" },
      { date: "2026-03-10", desc: "스팀 게임", amount: 28_000, type: :expense, cat: "문화생활/게임" },

      # 3/11
      { date: "2026-03-11", desc: "점심 우동", amount: 7_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-11", desc: "메가커피", amount: 3_000, type: :expense, cat: "카페/커피" },

      # 3/12
      { date: "2026-03-12", desc: "초밥 저녁", amount: 28_000, type: :expense, cat: "식비/저녁" },
      { date: "2026-03-12", desc: "유니클로 바지", amount: 39_900, type: :expense, cat: "의류" },

      # 3/13
      { date: "2026-03-13", desc: "점심 백반", amount: 7_000, type: :expense, cat: "식비/점심" },
      { date: "2026-03-13", desc: "편의점 간식", amount: 5_200, type: :expense, cat: "간식류" },

      # 3/14
      { date: "2026-03-14", desc: "화이트데이 선물", amount: 35_000, type: :expense, cat: "기타" },
      { date: "2026-03-14", desc: "카페 데이트", amount: 12_500, type: :expense, cat: "카페/디저트" },

      # 3/15
      { date: "2026-03-15", desc: "부수입 프리랜서", amount: 500_000, type: :income, cat: "기타" },
      { date: "2026-03-15", desc: "주유", amount: 72_000, type: :expense, cat: "교통비/주유" },
      { date: "2026-03-15", desc: "중식 짬뽕", amount: 9_000, type: :expense, cat: "식비/점심" },

      # 3/16
      { date: "2026-03-16", desc: "배달 떡볶이", amount: 18_000, type: :expense, cat: "식비/배달" },
      { date: "2026-03-16", desc: "다이소", amount: 8_800, type: :expense, cat: "생필품" },

      # 3/17
      { date: "2026-03-17", desc: "점심 김밥", amount: 5_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-17", desc: "스타벅스", amount: 5_800, type: :expense, cat: "카페/커피" },
      { date: "2026-03-17", desc: "택시", amount: 8_400, type: :expense, cat: "교통비/택시" },

      # 3/18
      { date: "2026-03-18", desc: "양식 파스타", amount: 14_500, type: :expense, cat: "식비/저녁" },
      { date: "2026-03-18", desc: "유튜브 프리미엄", amount: 14_900, type: :expense, cat: "문화생활/구독료" },

      # 3/19
      { date: "2026-03-19", desc: "점심 냉면", amount: 10_000, type: :expense, cat: "식비/점심" },
      { date: "2026-03-19", desc: "커피", amount: 4_500, type: :expense, cat: "카페/커피" },
      { date: "2026-03-19", desc: "병원 진료", amount: 25_000, type: :expense, cat: "의료비" },

      # 3/20
      { date: "2026-03-20", desc: "점심 돈까스", amount: 9_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-20", desc: "배달 중식", amount: 16_000, type: :expense, cat: "식비/배달" },

      # 3/21
      { date: "2026-03-21", desc: "마트 장보기", amount: 62_000, type: :expense, cat: "생필품" },
      { date: "2026-03-21", desc: "소고기 저녁", amount: 45_000, type: :expense, cat: "식비/저녁" },
      { date: "2026-03-21", desc: "와인", amount: 18_000, type: :expense, cat: "간식류" },

      # 3/22
      { date: "2026-03-22", desc: "브런치", amount: 16_500, type: :expense, cat: "식비/점심" },
      { date: "2026-03-22", desc: "카페 라떼", amount: 5_500, type: :expense, cat: "카페/커피" },
    ]

    count = 0
    transactions.each do |t|
      category = cats[t[:cat]]
      unless category
        puts "  ⚠️  카테고리 '#{t[:cat]}' 없음 — 건너뜀"
        next
      end

      user.transactions.create!(
        date: Date.parse(t[:date]),
        description: t[:desc],
        amount: t[:amount],
        transaction_type: t[:type],
        category: category,
        status: :confirmed
      )
      count += 1
    end

    puts "  #{count}건 생성 완료!"

    # 요약
    march = user.transactions.where(date: Date.new(2026, 3, 1)..Date.new(2026, 3, 31))
    income = march.where(transaction_type: :income).sum(:amount)
    expense = march.where(transaction_type: :expense).sum(:amount)
    puts "\n=== 3월 요약 ==="
    puts "  수입: #{income.to_s(:delimited)}원"
    puts "  지출: #{expense.to_s(:delimited)}원"
    puts "  순수익: #{(income - expense).to_s(:delimited)}원"
  end
end
