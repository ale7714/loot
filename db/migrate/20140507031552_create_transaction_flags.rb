class CreateTransactionFlags < ActiveRecord::Migration
  def change
    create_table :transaction_flags, primary_key: :transaction_id do |t|
			t.string :memo

      t.timestamps
    end
  end
end
