`timescale 1ns/1ps
module tb;
  reg si_clk=0,so_clk=0,si_res_n=0,so_res_n=0,shift_in=0,shift_out=0;
  reg [7:0] d_in=0;
  wire [7:0] d_out;
  wire full,almost_full,empty,almost_empty;
  openhmc_async_fifo #(.DWIDTH(8),.ENTRIES(8)) dut(.*);
  always #5 si_clk=~si_clk;
  always #7 so_clk=~so_clk;
  reg [7:0] queue[0:4095];
  integer head=0,tail=0,reads=0,i,j;
  task put(input [7:0] value);
    begin
      @(negedge si_clk); while(full) @(negedge si_clk);
      d_in=value;shift_in=1;
      @(posedge si_clk);queue[tail]=value;tail=tail+1;
      @(negedge si_clk);shift_in=0;
    end
  endtask
  task get;
    begin
      @(negedge so_clk);while(empty) @(negedge so_clk);
      shift_out=1;
      @(posedge so_clk);
      if(d_out !== queue[head]) $fatal(1,"DATA_FAIL index=%0d got=%h expected=%h",head,d_out,queue[head]);
      head=head+1;reads=reads+1;
      @(negedge so_clk);shift_out=0;
    end
  endtask
  task reset_fifo;
    begin
      shift_in=0;shift_out=0;si_res_n=0;so_res_n=0;
      repeat(5) @(negedge so_clk);
      si_res_n=1;so_res_n=1;head=0;tail=0;
      repeat(5) @(negedge so_clk);
      if(full || !empty) $fatal(1,"RESET_FLAGS");
    end
  endtask
  initial begin
    reset_fifo;
    for(j=0;j<8;j=j+1) begin
      for(i=0;i<8;i=i+1)put(8'(j*8+i));
      repeat(5) @(negedge si_clk);
      if(!full || !almost_full) $fatal(1,"FULL_FLAGS");
      for(i=0;i<8;i=i+1)get;
      repeat(5) @(negedge so_clk);
      if(!empty || !almost_empty) $fatal(1,"EMPTY_FLAGS");
    end
    fork
      begin for(integer k=0;k<96;k=k+1) put(8'(k^8'ha5));end
      begin for(integer k=0;k<96;k=k+1) get;end
    join
    put(8'hab);reset_fifo;put(8'hde);get;
    $display("OPENHMC_GOLDEN_PASS reads=%0d",reads);$finish;
  end
  initial begin #100000;$fatal(1,"TIMEOUT");end
endmodule
