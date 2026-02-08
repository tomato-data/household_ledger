DEFAULT_CATEGORIES = [
  { name: "식비", emoji: "🍽️", position: 1 },
  { name: "간식류", emoji: "🍪", position: 2 },
  { name: "카페", emoji: "☕", position: 3 },
  { name: "교통비", emoji: "🚗", position: 4 },
  { name: "문화생활", emoji: "🎭", position: 5 },
  { name: "의류", emoji: "👔", position: 6 },
  { name: "생필품", emoji: "🛒", position: 7 },
  { name: "의료비", emoji: "🏥", position: 8 },
  { name: "월급", emoji: "💰", position: 9 },
  { name: "월세", emoji: "🏠", position: 10 },
  { name: "통신비", emoji: "📱", position: 11 },
  { name: "공과금", emoji: "⚡", position: 12 },
  { name: "기타", emoji: "📝", position: 13 }
].freeze

user = User.find_or_create_by!(email: "test@test.com") do |u|
  u.password = "password123"
end

DEFAULT_CATEGORIES.each do |cat|
  user.categories.find_or_create_by!(name: cat[:name]) do |c|
    c.emoji = cat[:emoji]
    c.position = cat[:position]
  end
end

puts "Seed 완료: #{user.email} / 카테고리 #{user.categories.count}개"
