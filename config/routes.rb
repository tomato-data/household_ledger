Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root "dashboard#index", as: :authenticated_root
  end

  unauthenticated do
    root to: redirect("/users/sign_in"), as: :unauthenticated_root
  end


  get "dashboard", to: "dashboard#index", as: :dashboard_index
  get "dashboard/daily_transactions", to: "dashboard#daily_transactions", as: :dashboard_daily_transactions


  resources :transactions, except: [ :index, :show ]
  resource :statistics, only: [ :show ] do
    get :chart_data, on: :member
    get :category_trend, on: :member
  end

  resources :categories do
    patch :reorder, on: :collection
  end

  resources :credit_cards
  resources :recurring_transactions
  resources :asset_adjustments

  get "up" => "rails/health#show", as: :rails_health_check
end
