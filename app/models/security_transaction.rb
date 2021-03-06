# Copyright (c) 2016 Scott O'Hara, oharagroup.net
# frozen_string_literal: true

# Security transaction
class SecurityTransaction < Transaction
	has_one :header, class_name: 'SecurityTransactionHeader', foreign_key: 'transaction_id', dependent: :destroy, autosave: true

	class << self
		def create_from_json(json)
			s = super
			s.build_header.update_from_json json
			s
		end
	end

	def update_from_json(json)
		super
		header.update_from_json json
		self
	end

	def method_missing(method, *args, &block)
		validate_method?(method) do |match|
			public_send "validate_#{match[2]}", match[1]
			true
		end || super
	end

	def respond_to_missing?(method, include_all = false)
		validate_method?(method) || super
	end

	def validate_presence(attr)
		errors[:base] << "#{attr.capitalize} can't be blank" if instance_eval "header.#{attr}.blank?"
	end

	def validate_absence(attr)
		errors[:base] << "#{attr.capitalize} must be blank" unless instance_eval "header.#{attr}.blank?"
	end

	def as_json(options = {})
		super.merge header.as_json
	end

	private unless Rails.env.eql? 'test'

	def validate_method?(method, &block)
		/^validate_(.+)_(presence|absence)$/.match method.to_s, &block
	end
end
