# Copyright (c) 2016 Scott O'Hara, oharagroup.net
# frozen_string_literal: true

require 'rails_helper'

RSpec.describe StatusesController, type: :controller do
	before :each do
		expect(TransactionAccount).to receive_message_chain(:where, :where, :update_all).with status: status
	end

	describe 'PATCH update', request: true do
		before :each do
			patch :update, params: {account_id: '1', transaction_id: '1', (status || request_status) => true}
		end

		context 'Cleared' do
			let(:status) { 'Cleared' }

			it('should update the status') {}
		end

		context 'Reconciled' do
			let(:status) { 'Reconciled' }

			it('should update the status') {}
		end

		context 'invalid status' do
			let(:request_status) { 'invalid' }
			let(:status) { nil }

			it('should set the status to nil') {}
		end
	end

	describe 'DELETE destroy', request: true do
		let(:status) { nil }

		it 'should clear the existing status' do
			delete :destroy, params: {account_id: '1', transaction_id: '1'}
		end
	end
end
