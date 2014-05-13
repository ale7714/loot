class FlagsController < ApplicationController

	def update
		transaction = Transaction.find(params[:transaction_id])
		if transaction.flag.nil?
			transaction.build_flag(:memo => params[:memo])
		else
			transaction.flag.memo = params[:memo]
		end
		transaction.save
		head :status => :ok
	end

	def destroy
		Transaction.find(params[:transaction_id]).flag.destroy
		head :status => :ok
	end

end