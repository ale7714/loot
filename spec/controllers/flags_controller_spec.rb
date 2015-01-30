require 'rails_helper'

RSpec.describe FlagsController, type: :controller do
	describe "PATCH update", request: true do
		let(:memo) { "Test flag" }

		before :each do
			expect(Transaction).to receive(:find).with("1").and_return transaction
		end

		context "when a flag doesn't already exist" do
			let(:transaction) { create :transaction }
			
			it "should create a new flag" do
				expect(transaction).to receive(:build_flag).with memo: memo
			end
		end

		context "when a flag already exists" do
			let(:transaction) { create :transaction, :flagged }

			it "should update the existing flag" do
				expect(transaction).to_not receive :build_flag
			end
		end

		after :each do
			patch :update, transaction_id: "1", memo: memo
		end
	end

	describe "DELETE destroy", request: true do
		let(:transaction) { create :transaction, :flagged }

		it "should delete an existing flag" do
			expect(Transaction).to receive(:find).with("1").and_return transaction
			expect(transaction.flag).to receive(:destroy)
			delete :destroy, transaction_id: "1"
		end
	end
end
