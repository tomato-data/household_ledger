class RecurringTransaction < ApplicationRecord
  include Discard::Model
  enum :transaction_type, { income: "income", expense: "expense" }
  enum :frequency, { weekly: "weekly", monthly: "monthly", yearly: "yearly" }
  self.discard_column = :discarded_at
  default_scope -> { kept }
  belongs_to :user
  has_many :transactions
end
