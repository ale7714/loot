class SecuritiesController < ApplicationController
	respond_to :json

	def index
		if params.has_key? :include_balances
			respond_with Security.list
		else
			respond_with Security.order({favourite: :desc}, :name), except: [:current_holding, :closing_balance, :num_transactions, :unused]
		end
	end

	def show
		respond_with Security.find params[:id]
	end

	def create
		render json: Security.create(name: params['name'], code: params['code'])
	end

	def update
		security = Security.find params[:id]
		security.update_attributes!(name: params['name'], code: params['code'])
		render json: security
	end

	def destroy
		Security.find(params[:id]).destroy
		head :ok
	end
end
