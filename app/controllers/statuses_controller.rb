class StatusesController < ApplicationController

	def update
		status = params.keys.keep_if {|status| %w(pending cleared).include? status }.first
		update_status status
	end

	def destroy
		update_status
	end

	def update_status(status = nil)
		TransactionAccount
			.where(:account_id => params[:account_id])
			.where(:transaction_id => params[:transaction_id])
			.update_all(:status => status)

		head :status => :ok
	end
end