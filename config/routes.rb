Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root "dashboard#index", as: :authenticated_root
  end

  unauthenticated do
    root "devise/sessions#new", as: :unauthenticated_root
  end

  resource :dashboard, only: [] do
    get :index, on: :collection
    get :daily_transactions, on: :collection
  end

  resources :transactions
  resource :statistics, only: [ :show ] do
    get :chart_data, on: :member
  end

  resources :categories do
    patch :reorder, on: :collection
  end

  resources :recurring_transactions
  resources :asset_adjustments

  get "up" => "rails/health#show", as: :rails_health_check
end
