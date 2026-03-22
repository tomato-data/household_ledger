class StatisticsController < ApplicationController
  def show
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    @type = params[:type] || "expense"
    @date_mode = params[:date_mode] || "purchase"
    @tab = params[:tab] || "category"

    if @tab == "trend"
      load_trend_data
    else
      load_category_data
    end
  end

  def category_trend
    @date = params[:date] ? Date.parse(params[:date]) : Date.today
    @type = params[:type] || "expense"
    @date_mode = params[:date_mode] || "purchase"

    @months = (0..5).map { |i| @date - i.months }.reverse
    @selected_category_id = params[:category_id]&.to_i

    if @selected_category_id
      cat = current_user.categories.find_by(id: @selected_category_id)
      @selected_category_name = cat&.name
      @selected_trend = @months.map do |month|
        txns = fetch_transactions(month)
        by_cat = group_by_parent(txns)
        amount = by_cat[@selected_category_id]&.fetch(:amount, 0) || 0
        { month: month, amount: amount }
      end
      # 차트 색상
      all_cats = group_by_parent(fetch_transactions(@date)).keys
      @color_index = all_cats.index(@selected_category_id) || 0
    end

    render partial: "statistics/category_trend_chart"
  end

  private

  def load_category_data
    transactions = fetch_transactions(@date)

    parent_groups = {}
    transactions.each do |t|
      cat = t.category
      parent = cat.parent || cat
      parent_groups[parent.id] ||= {
        name: parent.name, icon: parent.icon, color: parent.color,
        amount: 0, subcategories: {}
      }
      parent_groups[parent.id][:amount] += t.amount

      if cat.parent_id
        parent_groups[parent.id][:subcategories][cat.id] ||= {
          name: cat.name, icon: cat.icon, color: cat.color, amount: 0
        }
        parent_groups[parent.id][:subcategories][cat.id][:amount] += t.amount
      end
    end

    @category_stats = parent_groups.values
                        .sort_by { |s| -s[:amount] }
                        .map do |s|
                          s[:subcategories] = s[:subcategories].values.sort_by { |sc| -sc[:amount] }
                          s
                        end

    @total = @category_stats.sum { |stat| stat[:amount] }
  end

  def load_trend_data
    # 최근 6개월 데이터
    @months = (0..5).map { |i| @date - i.months }.reverse

    # 전월 대비: 이번 달 vs 지난 달 카테고리별
    this_month_txns = fetch_transactions(@date)
    prev_month_txns = fetch_transactions(@date.prev_month)

    this_by_cat = group_by_parent(this_month_txns)
    prev_by_cat = group_by_parent(prev_month_txns)

    all_cat_ids = (this_by_cat.keys + prev_by_cat.keys).uniq
    @comparisons = all_cat_ids.map do |cat_id|
      this_data = this_by_cat[cat_id]
      prev_data = prev_by_cat[cat_id]
      this_amount = this_data ? this_data[:amount] : 0
      prev_amount = prev_data ? prev_data[:amount] : 0
      change = prev_amount > 0 ? ((this_amount - prev_amount).to_f / prev_amount * 100).round(1) : nil

      {
        name: (this_data || prev_data)[:name],
        icon: (this_data || prev_data)[:icon],
        color: (this_data || prev_data)[:color],
        this_amount: this_amount,
        prev_amount: prev_amount,
        change: change
      }
    end.sort_by { |c| -(c[:change]&.abs || -1) }

    # 6개월 월별 트렌드 (카테고리별)
    @monthly_totals = @months.map do |month|
      txns = fetch_transactions(month)
      {
        month: month,
        total: txns.sum(&:amount),
        by_category: group_by_parent(txns)
      }
    end

    # 선택된 카테고리의 트렌드 (파라미터로 받음)
    @selected_category_id = params[:category_id]&.to_i
    if @selected_category_id
      cat = current_user.categories.find_by(id: @selected_category_id)
      @selected_category_name = cat&.name
      @selected_trend = @months.map do |month|
        data = @monthly_totals.find { |m| m[:month] == month }
        amount = data ? (data[:by_category][@selected_category_id]&.fetch(:amount, 0) || 0) : 0
        { month: month, amount: amount }
      end
    end
  end

  def fetch_transactions(date)
    start_date = date.beginning_of_month
    end_date = date.end_of_month

    if @date_mode == "purchase"
      current_user.transactions
        .where(transaction_type: @type)
        .includes(category: :parent)
        .where(
          "(credit_card_id IS NOT NULL AND purchase_date BETWEEN ? AND ?) OR (credit_card_id IS NULL AND date BETWEEN ? AND ?)",
          start_date, end_date, start_date, end_date
        )
    else
      current_user.transactions
        .where(date: start_date..end_date)
        .where(transaction_type: @type)
        .includes(category: :parent)
    end
  end

  def group_by_parent(transactions)
    groups = {}
    transactions.each do |t|
      cat = t.category
      parent = cat.parent || cat
      groups[parent.id] ||= { name: parent.name, icon: parent.icon, color: parent.color, amount: 0 }
      groups[parent.id][:amount] += t.amount
    end
    groups
  end
end
